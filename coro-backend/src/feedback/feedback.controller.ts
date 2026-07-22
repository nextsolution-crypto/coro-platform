import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(AuthGuard('jwt'))
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  // Tout utilisateur connecté peut soumettre un feedback
  @Post()
  create(@Body() body: { category: string; message: string }, @Request() req: any) {
    return this.feedbackService.create({
      category: body.category,
      message: body.message,
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });
  }

  // SUPER_ADMIN seulement pour lire tous les feedbacks
  @Get()
  findAll(@Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') throw new ForbiddenException();
    return this.feedbackService.findAll();
  }

  // SUPER_ADMIN seulement pour changer le statut
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') throw new ForbiddenException();
    return this.feedbackService.updateStatus(id, body.status);
  }

  // SUPER_ADMIN seulement pour supprimer
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') throw new ForbiddenException();
    return this.feedbackService.remove(id);
  }
}